import { IRecurringDebt, IRecurringMovementLink } from '@/features/recurringDebts/types';

export interface IRecurringDebtRepository {
  getAll(): Promise<IRecurringDebt[]>;
  getActive(): Promise<IRecurringDebt[]>;
  save(debt: IRecurringDebt): Promise<void>;
  update(debt: IRecurringDebt): Promise<void>;
  delete(id: string): Promise<void>;
  getLinks(recurringDebtId: string): Promise<IRecurringMovementLink[]>;
  getAllLinks(): Promise<IRecurringMovementLink[]>;
  saveLink(link: IRecurringMovementLink): Promise<void>;
  deleteLink(recurringDebtId: string, periodLabel: string): Promise<void>;
}
