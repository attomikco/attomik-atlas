export type BrandStatus = 'active' | 'draft' | 'paused' | 'offboarded'
export type CampaignType = 'email' | 'ad_copy' | 'social' | 'seo' | 'dtc_brief' | 'funnel'
export type CampaignStatus = 'draft' | 'in_review' | 'approved' | 'scheduled' | 'sent' | 'archived'
export type AssetType = 'guidelines' | 'html_template' | 'logo' | 'other'
export type ImageTag = 'product' | 'lifestyle' | 'ugc' | 'background' | 'seasonal' | 'logo' | 'press' | 'shopify' | 'generated' | 'other'

export interface FontStyle {
  family: string
  weight: string
  transform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  letterSpacing?: 'wide' | 'tight' | 'normal'
}

export interface Competitor {
  name: string
  website?: string
  notes?: string
}

export interface Product {
  name: string
  description?: string
  price_range?: string
  url?: string
}

export interface CustomerPersona {
  name: string
  age_range?: string
  description: string
  pain_points?: string[]
  channels?: string[]
}

export interface BrandVoiceExample {
  id: string
  created_at: string
  brand_id: string
  category: 'good' | 'bad'
  label: string | null
  content: string
  notes: string | null
}

export interface Brand {
  id: string
  created_at: string
  updated_at: string
  name: string
  slug: string
  website: string | null
  industry: string | null
  status: BrandStatus
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  accent_font_color: string | null
  heading_color: string | null
  body_color: string | null
  // Extended color system
  bg_base: string | null
  bg_dark: string | null
  bg_secondary: string | null
  bg_accent: string | null
  text_on_base: string | null
  text_on_dark: string | null
  text_on_accent: string | null
  btn_primary: string | null
  btn_primary_text: string | null
  btn_secondary: string | null
  btn_secondary_text: string | null
  btn_tertiary: string | null
  btn_tertiary_text: string | null
  font_primary: string | null
  font_secondary: string | null
  font_heading: FontStyle | null
  font_body: FontStyle | null
  custom_fonts_css: string | null
  default_headline: string | null
  default_body_text: string | null
  default_cta: string | null
  brand_voice: string | null
  target_audience: string | null
  tone_keywords: string[] | null
  avoid_words: string[] | null
  logo_url: string | null
  notes: string | null
  mission: string | null
  vision: string | null
  values: string[] | null
  competitors: Competitor[] | null
  products: Product[] | null
  customer_personas: CustomerPersona[] | null
}

export interface BrandAsset {
  id: string
  created_at: string
  brand_id: string
  type: AssetType
  file_name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  notes: string | null
  parsed_text: string | null
}

export interface BrandImage {
  id: string
  created_at: string
  brand_id: string
  file_name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  tag: ImageTag
  alt_text: string | null
  width: number | null
  height: number | null
  source_url: string | null
  source: string | null
}

export interface Campaign {
  id: string
  created_at: string
  updated_at: string
  brand_id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  subject: string | null
  platform: string | null
  goal: string | null
  key_message: string | null
  offer: string | null
  audience_notes: string | null
  scheduled_at: string | null
  sent_at: string | null
  from_name: string | null
  from_email: string | null
  reply_to: string | null
  preview_text: string | null
  angle: string | null
  brand?: Brand
}

export interface CampaignAsset {
  id: string
  created_at: string
  campaign_id: string
  brand_id: string
  file_name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  asset_type: 'creative' | 'other'
  notes: string | null
}

export interface GeneratedContent {
  id: string
  created_at: string
  campaign_id: string
  brand_id: string
  type: string
  version: number
  content: string
  prompt_used: string | null
  is_approved: boolean
  approved_at: string | null
  notes: string | null
}

export interface EmailSend {
  id: string
  created_at: string
  campaign_id: string
  brand_id: string
  content_id: string
  resend_id: string | null
  recipient_count: number | null
  status: 'pending' | 'sent' | 'failed'
  error_message: string | null
  metadata: Record<string, unknown> | null
}

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne?: boolean; referencedRelation: string; referencedColumns: string[] }

export type Database = {
  public: {
    Tables: {
      brands: { Row: Brand; Insert: Omit<Brand, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Brand>; Relationships: Rel[] }
      brand_assets: { Row: BrandAsset; Insert: Omit<BrandAsset, 'id' | 'created_at'>; Update: Partial<BrandAsset>; Relationships: Rel[] }
      brand_images: { Row: BrandImage; Insert: Omit<BrandImage, 'id' | 'created_at'>; Update: Partial<BrandImage>; Relationships: Rel[] }
      brand_voice_examples: { Row: BrandVoiceExample; Insert: Omit<BrandVoiceExample, 'id' | 'created_at'>; Update: Partial<BrandVoiceExample>; Relationships: Rel[] }
      campaigns: { Row: Campaign; Insert: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Campaign>; Relationships: Rel[] }
      generated_content: { Row: GeneratedContent; Insert: Omit<GeneratedContent, 'id' | 'created_at'>; Update: Partial<GeneratedContent>; Relationships: Rel[] }
      email_sends: { Row: EmailSend; Insert: Omit<EmailSend, 'id' | 'created_at'>; Update: Partial<EmailSend>; Relationships: Rel[] }
      campaign_assets: { Row: CampaignAsset; Insert: Omit<CampaignAsset, 'id' | 'created_at'>; Update: Partial<CampaignAsset>; Relationships: Rel[] }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
