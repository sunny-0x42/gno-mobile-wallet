/** Minimal react-native shim for accidental imports from shared modules. */
export const Platform = { OS: 'web' as const, select: <T,>(o: { web?: T; default?: T }) => o.web ?? o.default };
export default { Platform };
