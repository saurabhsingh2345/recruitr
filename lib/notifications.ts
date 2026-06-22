import { connectDB } from '@/lib/mongodb'
import { Notification, NotificationType } from '@/lib/models/Notification'
import { Types } from 'mongoose'

export async function createNotification(
  userId: string | Types.ObjectId,
  type: NotificationType,
  title: string,
  body: string,
  link = ''
) {
  try {
    await connectDB()
    await Notification.create({ userId, type, title, body, link })
  } catch {
    // Notifications are best-effort — never let a failure block the main flow
  }
}
