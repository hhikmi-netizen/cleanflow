export type Role = 'admin' | 'employee'
export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'transfer'
export type DepositMode = 'on_site' | 'pickup'
export type DeliveryMode = 'on_site' | 'delivery'
export type ClientType = 'individual' | 'business'

export interface Pressing {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  ice?: string
  logo_url?: string
  currency: string
  tax_rate: number
  business_hours: Record<string, string>
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  pressing_id: string
  role: Role
  full_name: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  pressing_id: string
  name: string
  phone: string
  email?: string
  address?: string
  client_type: ClientType
  ice?: string
  notes?: string
  total_orders: number
  total_spent: number
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  pressing_id: string
  name: string
  category: string
  price_individual: number
  price_business: number
  unit: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  pressing_id: string
  client_id?: string
  order_number: string
  status: OrderStatus
  subtotal: number
  tax: number
  total: number
  payment_method: PaymentMethod
  paid: boolean
  deposit: number
  deposit_date?: string
  deposit_mode?: DepositMode
  delivery_mode?: DeliveryMode
  cancelled_reason?: string
  pickup_date?: string
  delivered_at?: string
  notes?: string
  created_at: string
  updated_at: string
  clients?: Pick<Client, 'id' | 'name' | 'phone' | 'address'>
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  service_id?: string
  service_name: string
  quantity: number
  unit_price: number
  subtotal: number
  notes?: string
  created_at: string
}

export interface Settings {
  id: string
  pressing_id: string
  whatsapp_enabled: boolean
  whatsapp_phone?: string
  auto_notify_ready: boolean
  invoice_footer?: string
  created_at: string
  updated_at: string
}

export type IncidentType = 'damage' | 'loss' | 'delay' | 'quality' | 'wrong_item' | 'other'
export type IncidentStatus = 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'rejected'
export type ResolutionAction = 'partial_refund' | 'full_refund' | 'gesture' | 'redo_service' | 'none'

export interface Incident {
  id: string
  pressing_id: string
  order_id?: string
  client_id?: string
  type: IncidentType
  description: string
  status: IncidentStatus
  resolution_action?: ResolutionAction
  resolution_notes?: string
  created_at: string
  updated_at: string
  orders?: { order_number: string } | null
  clients?: { name: string; phone: string } | null
}

export interface IncidentHistory {
  id: string
  incident_id: string
  user_id?: string
  action: string
  note?: string
  created_at: string
}

export interface Payment {
  id: string
  pressing_id: string
  order_id: string
  amount: number
  method: PaymentMethod | 'credit'
  notes?: string
  created_at: string
}

export interface DashboardStats {
  ordersToday: number
  revenueToday: number
  pendingOrders: number
  totalClients: number
  revenueMonth: number
  ordersMonth: number
}
