export interface Home {
  id: number;
  name: string;
  address: string | null;
  year_built: number | null;
  year_bought: number | null;
  notes: string | null;
  cover_photo: string | null;
  created_at: string;
  updated_at: string;
  room_count?: number;
  project_count?: number;
}

export interface Room {
  id: number;
  home_id: number;
  name: string;
  icon: string | null;
  floor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  project_count?: number;
  item_count?: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface Contractor {
  id: number;
  project_id: number;
  company_name: string;
  contractor_type: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  home_id: number;
  room_id: number | null;
  category_id: number | null;
  name: string;
  description: string | null;
  status: 'planned' | 'in_progress' | 'completed';
  year_created: number | null;
  estimated_cost: number;
  actual_cost: number;
  warranty_info: string | null;
  maintenance_info: string | null;
  created_at: string;
  updated_at: string;
  category_name?: string;
  room_name?: string;
  line_items?: LineItem[];
  attachments?: Attachment[];
  contractors?: Contractor[];
}

export interface Item {
  id: number;
  room_id: number;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  warranty_expiry: string | null;
  notes: string | null;
  warranty_info: string | null;
  maintenance_info: string | null;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
}

export interface LineItem {
  id: number;
  project_id: number;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  vendor: string | null;
  notes: string | null;
  created_at: string;
}

export interface Attachment {
  id: number;
  home_id: number | null;
  room_id: number | null;
  project_id: number | null;
  item_id: number | null;
  file_name: string;
  stored_name: string;
  file_type: 'photo' | 'document';
  mime_type: string | null;
  file_size: number | null;
  caption: string | null;
  photo_category: 'before' | 'after' | null;
  created_at: string;
}
