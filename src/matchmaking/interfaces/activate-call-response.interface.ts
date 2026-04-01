import { QueueTicket } from './queue-ticket.interface';

export interface ActivateCallWaitingResponse {
    type: 'waiting';
    ticket: QueueTicket;
}

export interface ActivateCallMatchedResponse {
    type: 'matched';
    ticket: QueueTicket;
    matchedUserId: string;
    roomId: string;
}

export type ActivateCallResponse =
    | ActivateCallWaitingResponse
    | ActivateCallMatchedResponse;