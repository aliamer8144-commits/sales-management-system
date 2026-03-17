import bcrypt from 'bcryptjs';
import { db } from './db';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createUser(email: string, password: string, name: string, role: 'admin' | 'user' = 'user') {
  const hashedPassword = await hashPassword(password);
  return db.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
    },
  });
}

export async function getUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
  });
}

export async function validateUser(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user) return null;
  
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return null;
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function createDefaultAdmin() {
  const existingAdmin = await getUserByEmail('admin@example.com');
  if (!existingAdmin) {
    await createUser('admin@example.com', 'admin123', 'مدير النظام', 'admin');
    console.log('Default admin created: admin@example.com / admin123');
  }
}
