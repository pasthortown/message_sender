export interface TextoContent {
  title: string;
  text: string;
}

export interface ImagenContent {
  image: string;
}

export type MessageContent = TextoContent | ImagenContent;

export interface Message {
  item_id: number;
  description: string;
  type: string;
  content: MessageContent;
  duration: number;
  link: string;
  zone?: number;
  width?: number;
}
