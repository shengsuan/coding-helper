export interface User {
  name: string;
  email: string;
}

interface StoredUser extends User {
  password: string;
}

const USERS_KEY = 'coding-helper.users';
const SESSION_KEY = 'coding-helper.session';

function readUsers(): StoredUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]') as StoredUser[]; } catch { return []; }
}

export function getSession(): User | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as User | null; } catch { return null; }
}

export function register(name: string, email: string, password: string): User {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  if (users.some((user) => user.email === normalizedEmail)) throw new Error('ACCOUNT_EXISTS');
  const user = { name: name.trim(), email: normalizedEmail };
  users.push({ ...user, password });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function login(email: string, password: string): User {
  const user = readUsers().find((item) => item.email === email.trim().toLowerCase() && item.password === password);
  if (!user) throw new Error('INVALID_CREDENTIALS');
  const session = { name: user.name, email: user.email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout(): void { localStorage.removeItem(SESSION_KEY); }
