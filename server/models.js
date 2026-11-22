import mongoose from 'mongoose'

const { Schema, model } = mongoose
const options = { timestamps: true }

const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  city: { type: String, required: true, trim: true, maxlength: 80 },
  ageConfirmed: { type: Boolean, required: true, default: false },
  interests: [{ type: String, trim: true, maxlength: 40 }],
  skills: [{ type: String, trim: true, maxlength: 40 }],
  bio: { type: String, trim: true, maxlength: 400, default: '' },
  discoverable: { type: Boolean, default: true },
  role: { type: String, enum: ['user', 'communityAdmin', 'eventOrganizer', 'platformAdmin'], default: 'user' },
}, options)
userSchema.index({ city: 1, interests: 1, discoverable: 1 })

const communitySchema = new Schema({
  legacyKey: { type: String, unique: true, index: true },
  name: { type: String, required: true, trim: true }, category: { type: String, required: true }, state: { type: String, required: true }, district: { type: String, required: true }, city: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User' }, handlerName: { type: String, trim: true, maxlength: 80 }, approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved', index: true }, discountCode: { type: String, trim: true, maxlength: 40 },
  members: { type: Number, default: 0 }, mode: { type: String, enum: ['Online', 'In person', 'Hybrid'], default: 'In person' },
  membershipMode: { type: String, enum: ['open', 'approval', 'invite-only'], default: 'approval' }, rules: [String],
  emoji: String, tone: String, description: String, objectives: [String], schedule: String, venue: String,
  feeLabel: String, feeAmount: { type: Number, min: 0, default: 0 }, capacity: { type: Number, min: 1 },
  spotsRemaining: { type: Number, min: 0 }, eligibility: String, questions: [String], nextEvent: { type: Schema.Types.ObjectId, ref: 'Event' },
}, options)
communitySchema.index({ state: 1, district: 1, city: 1, category: 1 })

const eventSchema = new Schema({
  legacyKey: { type: String, unique: true, index: true }, community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  title: { type: String, required: true, trim: true }, description: { type: String, maxlength: 2000 },
  startsAt: { type: Date, required: true, index: true }, time: String, place: String,
  mode: { type: String, enum: ['Online', 'In person', 'Hybrid'], default: 'In person' }, capacity: { type: Number, min: 1, required: true },
  registeredCount: { type: Number, min: 0, default: 0 }, feeLabel: String, feeAmount: { type: Number, min: 0, default: 0 },
  eligibility: String, registrationDeadline: Date, emoji: String, tone: String, category: String,
}, options)
eventSchema.index({ community: 1, startsAt: 1 })

const applicationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  answers: { type: Map, of: String, default: {} }, status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, options)
applicationSchema.index({ user: 1, community: 1 }, { unique: true })

const interestRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  message: { type: String, required: true, maxlength: 600 }, status: { type: String, enum: ['sent', 'replied', 'closed'], default: 'sent' },
}, options)

const communityMessageSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
}, options)
communityMessageSchema.index({ community: 1, createdAt: -1 })

const registrationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  fullName: { type: String, required: true, trim: true, maxlength: 80 }, email: { type: String, required: true, lowercase: true, trim: true },
  forWhom: { type: String, required: true, enum: ['myself', 'child-with-guardian', 'someone-else'] },
  note: { type: String, maxlength: 500, default: '' }, status: { type: String, enum: ['registered', 'cancelled', 'attended'], default: 'registered' },
}, options)
registrationSchema.index({ user: 1, event: 1 }, { unique: true })

const reminderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  remindAt: { type: Date, required: true }, sentAt: Date,
}, options)
reminderSchema.index({ user: 1, event: 1 }, { unique: true })

const volunteerSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, fullName: { type: String, required: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true }, phone: { type: String, maxlength: 30, default: '' },
  motive: { type: String, required: true, maxlength: 1000 }, ideas: { type: String, required: true, maxlength: 1000 },
  availability: { type: String, maxlength: 200, default: '' }, status: { type: String, enum: ['submitted', 'reviewed', 'accepted', 'declined'], default: 'submitted' },
}, options)

const notificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, type: { type: String, required: true },
  title: { type: String, required: true, maxlength: 120 }, body: { type: String, maxlength: 500 }, readAt: Date, relatedId: String,
}, options)
notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 })

const followSchema = new Schema({ follower: { type: Schema.Types.ObjectId, ref: 'User', required: true }, followed: { type: Schema.Types.ObjectId, ref: 'User', required: true } }, options)
followSchema.index({ follower: 1, followed: 1 }, { unique: true })

export const User = mongoose.models.User || model('User', userSchema)
export const Community = mongoose.models.Community || model('Community', communitySchema)
export const Event = mongoose.models.Event || model('Event', eventSchema)
export const MembershipApplication = mongoose.models.MembershipApplication || model('MembershipApplication', applicationSchema)
export const InterestRequest = mongoose.models.InterestRequest || model('InterestRequest', interestRequestSchema)
export const CommunityMessage = mongoose.models.CommunityMessage || model('CommunityMessage', communityMessageSchema)
export const EventRegistration = mongoose.models.EventRegistration || model('EventRegistration', registrationSchema)
export const EventReminder = mongoose.models.EventReminder || model('EventReminder', reminderSchema)
export const VolunteerApplication = mongoose.models.VolunteerApplication || model('VolunteerApplication', volunteerSchema)
export const Notification = mongoose.models.Notification || model('Notification', notificationSchema)
export const Follow = mongoose.models.Follow || model('Follow', followSchema)
