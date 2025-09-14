export interface IMovement {
  id: number;
  description: string;
  amount: string;
  paymentMethod: string;
  typeOfMovement: string;
  category: string;
  date: Date;
}

export type TKeyPeriodFilter = "today" | "week" | "month";
