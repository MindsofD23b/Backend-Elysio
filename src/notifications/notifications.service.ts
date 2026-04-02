import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class NotificationsService {
  private expo = new Expo();

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async registerDeviceToken(
    userId: string,
    deviceToken: string,
  ): Promise<void> {
    if (!Expo.isExpoPushToken(deviceToken)) {
      throw new BadRequestException('Invalid Expo push token');
    }
    await this.usersRepository.update(userId, { deviceToken });
  }

  async removeDeviceToken(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { deviceToken: null });
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'deviceToken'],
    });

    if (!user?.deviceToken) return;

    if (!Expo.isExpoPushToken(user.deviceToken)) {
      await this.usersRepository.update(userId, { deviceToken: null });
      return;
    }

    const message: ExpoPushMessage = {
      to: user.deviceToken,
      title,
      body,
      sound: 'default',
      data,
    };

    const tickets = await this.expo.sendPushNotificationsAsync([message]);
    const tokenMap = new Map<string, string>();
    tickets.forEach((ticket) => {
      if (ticket.status === 'ok') {
        tokenMap.set(ticket.id, user.deviceToken!);
      }
    });

    this.scheduleReceiptCheck(tickets, tokenMap);
  }

  async sendPushNotificationToMultiple(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    if (userIds.length === 0) return;

    const users = await this.usersRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'deviceToken'],
    });

    const validUsers = users.filter(
      (u) => u.deviceToken && Expo.isExpoPushToken(u.deviceToken),
    );

    if (validUsers.length === 0) return;

    const messages: ExpoPushMessage[] = validUsers.map((u) => ({
      to: u.deviceToken!,
      title,
      body,
      sound: 'default',
      data,
    }));

    const tokenByMessage = new Map<number, string>();
    validUsers.forEach((u, i) => tokenByMessage.set(i, u.deviceToken!));

    const chunks = this.expo.chunkPushNotifications(messages);
    const allTickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      const tickets = await this.expo.sendPushNotificationsAsync(chunk);
      allTickets.push(...tickets);
    }

    const tokenMap = new Map<string, string>();
    allTickets.forEach((ticket, i) => {
      if (ticket.status === 'ok') {
        tokenMap.set(ticket.id, tokenByMessage.get(i) ?? '');
      }
    });

    this.scheduleReceiptCheck(allTickets, tokenMap);
  }

  private scheduleReceiptCheck(
    tickets: ExpoPushTicket[],
    tokenMap: Map<string, string>,
  ): void {
    const receiptIds = tickets
      .filter(
        (t): t is ExpoPushTicket & { status: 'ok'; id: string } =>
          t.status === 'ok',
      )
      .map((t) => t.id);

    if (receiptIds.length === 0) return;

    setTimeout(() => {
      this.checkReceipts(receiptIds, tokenMap).catch((err) =>
        console.error('Receipt check failed:', err),
      );
    }, 15_000);
  }

  private async checkReceipts(
    receiptIds: string[],
    tokenMap: Map<string, string>,
  ): Promise<void> {
    const chunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);

    for (const chunk of chunks) {
      const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);

      for (const [receiptId, receipt] of Object.entries(receipts)) {
        if (
          receipt.status === 'error' &&
          receipt.details?.error === 'DeviceNotRegistered'
        ) {
          const token = tokenMap.get(receiptId);
          if (token) {
            await this.usersRepository.update(
              { deviceToken: token },
              { deviceToken: null },
            );
          }
        }
      }
    }
  }
}
