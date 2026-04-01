import { MatchmakingState } from '../enums/matchmaking-state.enum';

export interface QueueTicket {
    ticketId: string;
    userId: string;
    state: MatchmakingState;
    poolKey: string;
    gender: string | null;
    targetGender: string | null;
    age: number | null;
    language: string | null;
    country: string | null;
    interests: string[];
    createdAt: string;
    updatedAt: string;
}