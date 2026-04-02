# PlateMate Backend

PlateMate is a food-sharing platform that connects donors with recipients. This repository contains the complete microservices backend.

## Architecture

- **5 isolated microservices**, each with its own PostgreSQL database (zero cross-database foreign keys)
- **RabbitMQ** topic exchange as the event bus for async inter-service communication
- **Node.js/Express** REST APIs
- **Docker Compose** for local orchestration

```
┌─────────────────────────────────────────────────────────────┐
│                        API Clients                          │
└───────┬────────┬────────┬────────┬──────────────────────────┘
        │        │        │        │
   :3001    :3002    :3003    :3004    :3005
        │        │        │        │        │
┌───────▼──┐ ┌───▼───┐ ┌──▼───┐ ┌──▼──────┐ ┌▼────────────┐
│ user-    │ │ food- │ │claim-│ │reputa-  │ │messaging-   │
│ location │ │invent.│ │serv. │ │tion-svc │ │service      │
│ service  │ │service│ │      │ │         │ │             │
└───┬──────┘ └───┬───┘ └──┬───┘ └──┬──────┘ └──┬──────────┘
    │DB:5433     │DB:5434  │DB:5435 │DB:5436     │DB:5437
    │            │         │        │             │
    └────────────┴─────────┴────────┴─────────────┘
                           │
                    ┌──────▼──────┐
                    │  RabbitMQ   │
                    │  :5672      │
                    └─────────────┘
```

## Services

| Service | Port | DB Port | Description |
|---------|------|---------|-------------|
| user-location-service | 3001 | 5433 | Auth, users, locations, blocks, reports |
| food-inventory-service | 3002 | 5434 | Food posts, watchlists |
| claim-service | 3003 | 5435 | Claim lifecycle management |
| reputation-service | 3004 | 5436 | Points, ratings, reviews, leaderboard |
| messaging-service | 3005 | 5437 | In-app messaging between donor and claimer |

### Environment Variables

Each service reads from environment variables (see `.env.example` in each service directory):

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port for the service | varies |
| `DB_HOST` | PostgreSQL hostname | `localhost` |
| `DB_PORT` | PostgreSQL port | varies |
| `DB_NAME` | Database name | varies |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `JWT_SECRET` | Secret for JWT signing | `secret` |
| `RABBITMQ_URL` | AMQP connection URL | `amqp://localhost:5672` |

## API Endpoints

### user-location-service (port 3001)

#### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, returns JWT tokens |
| POST | `/api/auth/refresh` | — | Refresh access token |
| POST | `/api/auth/logout` | ✓ | Invalidate refresh token |
| GET | `/api/auth/me` | ✓ | Get current user |
| POST | `/api/auth/forgot-password` | — | Request password reset |
| POST | `/api/auth/reset-password` | — | Reset password with token |

#### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/:id` | ✓ | Get user by ID |
| PUT | `/api/users/:id` | ✓ | Update own profile |

#### Locations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/locations` | ✓ | List own locations |
| POST | `/api/locations` | ✓ | Add location |
| PUT | `/api/locations/:id/activate` | ✓ | Set active location |
| DELETE | `/api/locations/:id` | ✓ | Delete location |

#### Blocks & Reports
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/blocks` | ✓ | Block a user |
| DELETE | `/api/blocks/:blockedId` | ✓ | Unblock a user |
| POST | `/api/reports` | ✓ | Submit a report |

### food-inventory-service (port 3002)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/posts` | — | List active posts (filter: category, keyword, lat/lng/radius) |
| POST | `/api/posts` | ✓ | Create food post |
| GET | `/api/posts/:id` | — | Get post details |
| PUT | `/api/posts/:id` | ✓ | Update own post |
| DELETE | `/api/posts/:id` | ✓ | Soft-delete own post |
| POST | `/api/posts/:id/publish` | ✓ | Publish draft post |
| GET | `/api/watchlists` | ✓ | List own watchlists |
| POST | `/api/watchlists` | ✓ | Create watchlist |
| DELETE | `/api/watchlists/:id` | ✓ | Delete watchlist |

### claim-service (port 3003)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/claims` | ✓ | List claims for current user |
| POST | `/api/claims` | ✓ | Create a claim |
| GET | `/api/claims/post/:postId` | ✓ | List claims for a post (donor only) |
| GET | `/api/claims/:id` | ✓ | Get claim details |
| PUT | `/api/claims/:id/approve` | ✓ | Approve a claim (donor) |
| PUT | `/api/claims/:id/reject` | ✓ | Reject a claim (donor) |

### reputation-service (port 3004)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reputation/leaderboard` | — | Top users by points |
| GET | `/api/reputation/:userId` | — | Get user reputation |
| POST | `/api/reviews` | ✓ | Submit a review |
| GET | `/api/reviews/user/:userId` | — | Get reviews for a user |

### messaging-service (port 3005)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/messages/:postId` | ✓ | Get messages for a post |
| POST | `/api/messages` | ✓ | Send a message |
| PUT | `/api/messages/:postId/read` | ✓ | Mark messages as read |

## Event System

Services communicate asynchronously via RabbitMQ using a topic exchange (`platemate_events`).

| Event | Routing Key | Published by | Consumed by |
|-------|-------------|--------------|-------------|
| USER_REGISTERED | `user.registered` | user-location | — |
| USER_BANNED | `user.banned` | user-location | food-inventory |
| POST_CREATED | `post.created` | food-inventory | reputation |
| POST_EXPIRED | `post.expired` | food-inventory | claim |
| POST_FAILED | `post.failed` | food-inventory | reputation |
| DONATION_COMPLETED | `donation.completed` | food-inventory | reputation |
| CLAIM_REQUESTED | `claim.requested` | claim | food-inventory |
| CLAIM_APPROVED | `claim.approved` | claim | food-inventory, reputation, messaging |
| CLAIM_REJECTED | `claim.rejected` | claim | — |
| PUSH_NOTIFICATION_REQUESTED | `push.notification.requested` | food-inventory | — |

## Health Checks

Each service exposes `GET /health` returning `{ "status": "ok", "service": "<name>" }`.

RabbitMQ management UI is available at http://localhost:15672 (guest/guest).
