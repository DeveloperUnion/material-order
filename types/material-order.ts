export type MaterialOrderItem = {
  id: string;
  name: string;
  size?: string | null;
  categoryName: string;
  quantity: number;
  weightPerUnit: number;
  totalWeight: number;
};

export type OrderDocument = {
  ordererName: string;
  siteName?: string;
  contactInfo?: string;
  loadingDate?: string;
  orderDate: string; // ISO8601形式
  // note?: string; // コメントアウト
  items: MaterialOrderItem[];
  totalWeight: number;
  truckId?: string | null;        // マスター選択時の id。カスタム入力時は null
  truckName?: string | null;       // 選択中トラック名（マスター・カスタム共通）
  truckCapacityKg?: number | null; // 選択中の積載量(kg)
};

