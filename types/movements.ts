export interface IMovement {
  id: number;
  description: string;
  amount: string;
  paymentMethod: string;
  typeOfMovement: string;
  category: string;
  date: Date;
  entity?: string;
}

export type TKeyPeriodFilter = "today" | "week" | "month";
