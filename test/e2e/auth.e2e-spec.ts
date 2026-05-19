import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcryptjs from 'bcryptjs';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../helpers/app.helper';

const TEST_EMAIL = `e2e-auth-${Date.now()}@test.internal`;
const TEST_PASSWORD = 'Test@12345';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;
  let createdUserId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const passwordHash = await bcryptjs.hash(TEST_PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        passwordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
    createdUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: createdUserId } }).catch(() => null);
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('rejects unknown email with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.internal', password: TEST_PASSWORD })
        .expect(401);
    });

    it('rejects wrong password with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: 'wrong' })
        .expect(401);
    });

    it('returns tokens on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      // refresh_token comes as httpOnly cookie
      const cookies = res.headers['set-cookie'] as string[] | string;
      const cookieStr = Array.isArray(cookies) ? cookies.join(';') : (cookies ?? '');
      expect(cookieStr).toMatch(/refresh_token=/);

      accessToken = res.body.data.accessToken;
      const match = cookieStr.match(/refresh_token=([^;]+)/);
      refreshToken = match ? match[1] : '';
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('returns current user with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(TEST_EMAIL);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns new access token using refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      accessToken = res.body.data.accessToken;
    });

    it('returns 401 without refresh cookie', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const cookies = res.headers['set-cookie'] as string[] | string;
      const cookieStr = Array.isArray(cookies) ? cookies.join(';') : (cookies ?? '');
      // Express clears cookie via expires=epoch or max-age=0
      expect(cookieStr.toLowerCase()).toMatch(/refresh_token=;|max-age=0|expires=thu, 01 jan 1970/);
    });
  });

  describe('Protected routes', () => {
    it('GET /properties returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/properties').expect(401);
    });

    it('GET /properties returns 200 with valid token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      const token = loginRes.body.data.accessToken;

      const res = await request(app.getHttpServer())
        .get('/properties')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // TransformInterceptor unwraps { data: [...], meta: {...} } → data field contains the array
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
