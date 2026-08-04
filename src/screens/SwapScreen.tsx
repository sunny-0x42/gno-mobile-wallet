import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, NavHeader, Screen, Spacer } from '@/components/ui';
import { DEFAULT_GAS, formatUgnotFee, gasFeeForWanted } from '@/config/networks';
import { SWAP_FEE_TIERS } from '@/config/swapTokens';
import { tokensForChain, type SwapToken } from '@/config/swapTokens';
import {
  buildExactInPlan,
  fromBaseUnits,
  quoteExactIn,
  toBaseUnits,
  type DryQuote,
  WUGNOT_PKG,
} from '@/services/gnoswapRouter';
import { fetchGrc20Balance, fetchNativeBalances } from '@/services/rpcBalance';
import { useWallet } from '@/provider/WalletProvider';
import type { RootStackParamList } from '@/router/types';
import { colors, spacing, typography } from '@/theme';
import { alertAsync, confirmAsync } from '@/utils/dialog';

type Props = NativeStackScreenProps<RootStackParamList, 'Swap'>;

export default function SwapScreen({ navigation }: Props) {
  const {
    network,
    activeAccount,
    isUnlocked,
    callRealm,
    client,
    switchNetwork,
    networks,
  } = useWallet();

  const tokens = useMemo(() => tokensForChain(network.chainId), [network.chainId]);
  const [tokenIn, setTokenIn] = useState<SwapToken>(tokens[0]);
  const [tokenOut, setTokenOut] = useState<SwapToken>(tokens[1] ?? tokens[0]);
  const [amountIn, setAmountIn] = useState('');
  const [useNative, setUseNative] = useState(true); // wrap GNOT when selling WUGNOT
  const [slippage, setSlippage] = useState('1'); // percent
  const [quote, setQuote] = useState<DryQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [balIn, setBalIn] = useState('0');
  const [balOut, setBalOut] = useState('0');
  const [picker, setPicker] = useState<'in' | 'out' | null>(null);

  // Prefer Topaz for GnoSwap pools
  useEffect(() => {
    if (network.chainId !== 'topaz-1') {
      const topaz = networks.find((n) => n.chainId === 'topaz-1' || n.id === 'topaz');
      if (topaz) switchNetwork(topaz.id).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const list = tokensForChain(network.chainId);
    setTokenIn(list[0]);
    setTokenOut(list[1] ?? list[0]);
  }, [network.chainId]);

  const loadBalances = useCallback(async () => {
    if (!activeAccount) return;
    try {
      if (useNative && tokenIn.wrapsNative) {
        const natives = await fetchNativeBalances(network.remote, activeAccount.address);
        const ug = natives.find((c) => c.denom === 'ugnot');
        setBalIn(ug?.amount ?? '0');
      } else {
        const b = await fetchGrc20Balance(network.remote, tokenIn.pkgPath, activeAccount.address, {
          symbol: tokenIn.symbol,
          decimals: tokenIn.decimals,
        });
        setBalIn(b?.amount ?? '0');
      }
      const bo = await fetchGrc20Balance(network.remote, tokenOut.pkgPath, activeAccount.address, {
        symbol: tokenOut.symbol,
        decimals: tokenOut.decimals,
      });
      setBalOut(bo?.amount ?? '0');
    } catch {
      /* ignore */
    }
  }, [activeAccount, network.remote, tokenIn, tokenOut, useNative]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const refreshQuote = useCallback(async () => {
    setError(undefined);
    setQuote(null);
    if (!amountIn || Number(amountIn) <= 0) return;
    if (tokenIn.id === tokenOut.id) {
      setError('Choose two different tokens');
      return;
    }
    setQuoting(true);
    try {
      const base = toBaseUnits(amountIn, tokenIn.decimals);
      const q = await quoteExactIn({
        rpcUrl: network.remote,
        inputToken: tokenIn.id,
        outputToken: tokenOut.id,
        amountIn: base,
      });
      setQuote(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setQuoting(false);
    }
  }, [amountIn, network.remote, tokenIn, tokenOut]);

  useEffect(() => {
    const t = setTimeout(() => {
      refreshQuote();
    }, 450);
    return () => clearTimeout(t);
  }, [refreshQuote]);

  const flip = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setQuote(null);
  };

  const onSwap = async () => {
    setError(undefined);
    if (!activeAccount) return setError('No account');
    if (!isUnlocked && !client.isMock) {
      return setError('Unlock wallet in Settings first');
    }
    if (!quote) return setError('Wait for a valid quote');
    if (network.chainId !== 'topaz-1') {
      return setError('Switch to Topaz network for GnoSwap pools');
    }

    const slippagePct = Number(slippage);
    if (!Number.isFinite(slippagePct) || slippagePct < 0 || slippagePct > 50) {
      return setError('Slippage must be 0–50%');
    }
    const slippageBps = Math.round(slippagePct * 100);
    const baseIn = toBaseUnits(amountIn, tokenIn.decimals);
    const plan = buildExactInPlan({
      input: tokenIn,
      output: tokenOut,
      amountIn: baseIn,
      quote,
      slippageBps,
      useNativeGnot: useNative && !!tokenIn.wrapsNative,
    });

    // Fees scale with gas_wanted × Topaz gasprice (~1ugnot/1000 gas), not a flat 1 GNOT/tx.
    const wrapGas = {
      gasFee: gasFeeForWanted(DEFAULT_GAS.wrapGasWanted),
      gasWanted: DEFAULT_GAS.wrapGasWanted,
    };
    const approveGas = {
      gasFee: gasFeeForWanted(DEFAULT_GAS.approveGasWanted),
      gasWanted: DEFAULT_GAS.approveGasWanted,
    };
    const swapGas = {
      gasFee: gasFeeForWanted(DEFAULT_GAS.swapGasWanted),
      gasWanted: DEFAULT_GAS.swapGasWanted,
    };
    const steps = plan.wrapUgnot ? 3 : 2;
    const feeParts = [
      plan.wrapUgnot ? `wrap ${formatUgnotFee(wrapGas.gasFee)}` : null,
      `approve ${formatUgnotFee(approveGas.gasFee)}`,
      `swap ${formatUgnotFee(swapGas.gasFee)}`,
    ].filter(Boolean);

    const ok = await confirmAsync(
      'Confirm swap',
      `Swap ${amountIn} ${useNative && tokenIn.wrapsNative ? 'GNOT' : tokenIn.symbol} → ~${fromBaseUnits(quote.amountOut, tokenOut.decimals)} ${tokenOut.symbol}\n` +
        `Min out: ${fromBaseUnits(plan.amountOutMin, tokenOut.decimals)} (${slippagePct}% slip)\n` +
        `Pool fee tier: ${quote.fee}\n` +
        `Network gas (~${steps} txs): ${feeParts.join(' + ')}\n` +
        `(Topaz min ≈ gas_wanted/1000 ugnot; not a flat 1 GNOT fee)`,
    );
    if (!ok) return;

    setSwapping(true);
    try {

      // 1) Wrap GNOT → WUGNOT if needed
      if (plan.wrapUgnot) {
        await callRealm(WUGNOT_PKG, 'Deposit', [], plan.wrapUgnot, wrapGas);
      }

      // 2) Approve router
      await callRealm(
        plan.approve.pkgPath,
        'Approve',
        [plan.approve.spender, plan.approve.amount],
        undefined,
        approveGas,
      );

      // 3) Swap (highest gas)
      const res = await callRealm(
        plan.swap.pkgPath,
        plan.swap.func,
        plan.swap.args,
        undefined,
        swapGas,
      );
      await alertAsync(
        'Swap submitted',
        res.result?.slice(0, 400) || 'Transaction sent via GnoSwap router.',
      );
      setAmountIn('');
      setQuote(null);
      await loadBalances();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSwapping(false);
    }
  };

  const pickToken = (t: SwapToken) => {
    if (picker === 'in') {
      if (t.id === tokenOut.id) setTokenOut(tokenIn);
      setTokenIn(t);
    } else if (picker === 'out') {
      if (t.id === tokenIn.id) setTokenIn(tokenOut);
      setTokenOut(t);
    }
    setPicker(null);
    setQuote(null);
  };

  return (
    <Screen scroll>
      <NavHeader title="Swap" onBack={() => navigation.goBack()} large />
      <Text style={styles.sub}>
        GnoSwap router · {network.name} ({network.chainId}). Direct MsgCall. Swap gas limit{' '}
        {(Number(DEFAULT_GAS.swapGasWanted) / 1e6).toFixed(0)}M · network fee ≈{' '}
        {formatUgnotFee(gasFeeForWanted(DEFAULT_GAS.swapGasWanted))}
        {useNative && tokenIn.wrapsNative
          ? ` (+ wrap/approve ≈ ${formatUgnotFee(gasFeeForWanted(DEFAULT_GAS.wrapGasWanted + DEFAULT_GAS.approveGasWanted))})`
          : ` (+ approve ≈ ${formatUgnotFee(gasFeeForWanted(DEFAULT_GAS.approveGasWanted))})`}
        .
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>You pay</Text>
        <View style={styles.row}>
          <Pressable style={styles.tokenBtn} onPress={() => setPicker('in')}>
            <Text style={styles.tokenSym}>
              {useNative && tokenIn.wrapsNative ? 'GNOT' : tokenIn.symbol}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </Pressable>
          <Input
            placeholder="0.0"
            keyboardType="decimal-pad"
            value={amountIn}
            onChangeText={setAmountIn}
            style={styles.amt}
          />
        </View>
        <Text style={styles.bal}>
          Balance:{' '}
          {fromBaseUnits(balIn, useNative && tokenIn.wrapsNative ? 6 : tokenIn.decimals)}{' '}
          {useNative && tokenIn.wrapsNative ? 'GNOT' : tokenIn.symbol}
        </Text>
        {tokenIn.wrapsNative ? (
          <Pressable
            onPress={() => setUseNative((v) => !v)}
            style={styles.toggle}
          >
            <Ionicons
              name={useNative ? 'checkbox' : 'square-outline'}
              size={18}
              color={colors.primary}
            />
            <Text style={styles.toggleText}>Use native GNOT (auto-wrap to WUGNOT)</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable onPress={flip} style={styles.flip}>
        <Ionicons name="swap-vertical" size={22} color={colors.tint} />
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.label}>You receive (est.)</Text>
        <View style={styles.row}>
          <Pressable style={styles.tokenBtn} onPress={() => setPicker('out')}>
            <Text style={styles.tokenSym}>{tokenOut.symbol}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.outAmt}>
            {quoting
              ? '…'
              : quote
                ? fromBaseUnits(quote.amountOut, tokenOut.decimals)
                : '0'}
          </Text>
        </View>
        <Text style={styles.bal}>
          Balance: {fromBaseUnits(balOut, tokenOut.decimals)} {tokenOut.symbol}
        </Text>
      </View>

      <View style={styles.metaCard}>
        <Text style={styles.metaLine}>
          Quote fee tier: {quote ? quote.fee : '—'}{' '}
          {quote
            ? `(${SWAP_FEE_TIERS.find((f) => f.fee === quote.fee)?.label ?? ''})`
            : ''}
          {quoting ? ' · updating…' : ''}
        </Text>
        <Text style={styles.metaLine} numberOfLines={2}>
          Route: {quote?.route ?? '—'}
        </Text>
        <View style={styles.slipRow}>
          <Text style={styles.label}>Slippage %</Text>
          <Input
            value={slippage}
            onChangeText={setSlippage}
            keyboardType="decimal-pad"
            style={styles.slipInput}
          />
        </View>
      </View>

      {error ? <Text style={styles.err}>{error}</Text> : null}
      {!activeAccount ? (
        <Text style={styles.err}>Import or create a wallet first.</Text>
      ) : null}

      <Spacer h={12} />
      <Button
        title={swapping ? 'Swapping…' : 'Swap via GnoSwap router'}
        icon="swap-horizontal"
        size="lg"
        loading={swapping || quoting}
        onPress={onSwap}
        disabled={!quote || swapping}
      />
      <Button title="Refresh quote" variant="secondary" onPress={refreshQuote} />

      <Modal visible={!!picker} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select token</Text>
            <ScrollView>
              {tokens.map((t) => (
                <Pressable
                  key={t.id}
                  style={styles.tokenRow}
                  onPress={() => pickToken(t)}
                >
                  <Text style={styles.tokenSym}>{t.symbol}</Text>
                  <Text style={styles.tokenName}>{t.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button title="Cancel" variant="ghost" onPress={() => setPicker(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { ...typography.footnote, marginBottom: 12 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: 8,
  },
  label: { ...typography.caption1, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tokenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgInput,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tokenSym: { ...typography.headline, fontSize: 16 },
  amt: { flex: 1, marginBottom: 0 },
  outAmt: {
    flex: 1,
    ...typography.title2,
    textAlign: 'right',
    paddingRight: 8,
  },
  bal: { ...typography.caption2, marginTop: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  toggleText: { ...typography.caption1, color: colors.textSecondary },
  flip: {
    alignSelf: 'center',
    padding: 8,
    marginVertical: 4,
    backgroundColor: colors.bgElevated,
    borderRadius: 20,
  },
  metaCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  metaLine: { ...typography.caption2, marginBottom: 4 },
  slipRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  slipInput: { width: 80, marginBottom: 0 },
  err: { ...typography.footnote, color: colors.danger, marginTop: 10 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { ...typography.title3, marginBottom: 12 },
  tokenRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  tokenName: { ...typography.caption1, color: colors.textSecondary },
});
