export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      validations: {
        Row: {
          creator_token_hash: string | null;
          created_at: string;
          decision: string;
          id: string;
          input_hash: string;
          input_tokens: number | null;
          model: string;
          output_tokens: number | null;
          owner_id: string | null;
          prompt_version: string;
          published_at: string | null;
          report_id: string;
          result: Json;
          share_id: string;
          source: string;
          style: string;
          visibility: string;
        };
        Insert: {
          creator_token_hash?: string | null;
          created_at?: string;
          decision: string;
          id?: string;
          input_hash: string;
          input_tokens?: number | null;
          model: string;
          output_tokens?: number | null;
          owner_id?: string | null;
          prompt_version?: string;
          published_at?: string | null;
          report_id: string;
          result: Json;
          share_id?: string;
          source: string;
          style: string;
          visibility?: string;
        };
        Update: {
          creator_token_hash?: string | null;
          decision?: string;
          input_hash?: string;
          input_tokens?: number | null;
          model?: string;
          output_tokens?: number | null;
          owner_id?: string | null;
          prompt_version?: string;
          published_at?: string | null;
          result?: Json;
          source?: string;
          style?: string;
          visibility?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
