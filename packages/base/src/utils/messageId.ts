import { MessageId } from '../types';

let counter = 0;

export const newMessageId = (): MessageId => {
  return `dedot-signer/${Date.now()}/${counter++}`;
};

export const isMessageId = (id: string) => {
  return id && id.startsWith('dedot-signer/');
};
