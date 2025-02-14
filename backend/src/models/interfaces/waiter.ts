import { z } from 'zod';

export type WaiterCallStatus = 'active' | 'acknowledged' | 'completed';

export interface WaiterCall {
  id: string;
  table_id: string;
  status: WaiterCallStatus;
  created_at: Date;
  updated_at: Date;
}

export const waiterCallStatusSchema = z.enum(['active', 'acknowledged', 'completed']);

export const waiterCallSchema = z.object({
  id: z.string().uuid(),
  table_id: z.string().uuid(),
  status: waiterCallStatusSchema,
  created_at: z.date(),
  updated_at: z.date()
});

export type WaiterCallCreate = Omit<WaiterCall, 'id' | 'created_at' | 'updated_at'>;
export type WaiterCallUpdate = Partial<Omit<WaiterCall, 'id' | 'created_at' | 'updated_at'>>;
