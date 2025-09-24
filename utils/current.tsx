export const addPoints = (amount: string) => {
  const cleanNumber = amount.replace(/\./g, "");
  return new Intl.NumberFormat("es-CO").format(Number(cleanNumber));
};
