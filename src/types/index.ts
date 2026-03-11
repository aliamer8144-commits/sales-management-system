// Product Types
export interface ProductUnit {
  id?: string;
  unitType: 'carton' | 'packet' | 'piece';
  unitName: string;
  purchasePrice: number;
  containsPieces: number;
  stockQuantity: number;
}

export interface Product {
  id: string;
  name: string;
  alertLimit: number;
  notes: string | null;
  units: ProductUnit[];
}

// Customer Types
export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  totalDebt?: number;
  totalPaid?: number;
  balance?: number;
}

// Invoice Types
export interface InvoiceItem {
  id: string;
  productId: string;
  productUnitId: string;
  quantity: number;
  salePrice: number;
  purchasePrice: number;
  unitType: string;
  unitName: string;
  productName: string;
}

export interface Invoice {
  id: string;
  invoiceType: string;
  totalAmount: number;
  totalProfit: number;
  notes: string | null;
  createdAt: string;
  userId: string;
  customerId: string | null;
  user: { id: string; name: string };
  customer: Customer | null;
  items: InvoiceItem[];
}

// Invoice Form Types
export interface InvoiceFormItem {
  productId: string;
  productName: string;
  productUnitId: string;
  unitName: string;
  unitType: string;
  quantity: number;
  salePrice: number;
  purchasePrice: number;
  availableStock: number;
}

// Product Form Types
export interface ProductFormData {
  name: string;
  alertLimit: string;
  notes: string;
  baseUnitType: 'carton' | 'packet' | 'piece';
  cartonPurchasePrice: string;
  cartonPacketsCount: string;
  packetPiecesCount: string;
  packetPurchasePrice: string;
  piecePurchasePrice: string;
  cartonStock: string;
  packetStock: string;
  pieceStock: string;
}

// Stats Types
export interface DashboardStats {
  totalSales: number;
  totalProfit: number;
  totalCapital: number;
  totalCredit: number;
}
