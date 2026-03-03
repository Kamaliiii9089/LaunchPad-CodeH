import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_FILE = path.join(process.cwd(), 'data', 'users.json');

// Ensure data directory exists
function ensureDataDir() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
    }
}

interface User {
    id: string;
    name: string;
    email: string;
    password: string;
    createdAt: string;
    updatedAt: string;
}

export class FileDB {
    static async findUserByEmail(email: string): Promise<User | null> {
        ensureDataDir();
        const users: User[] = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        return users.find(u => u.email === email) || null;
    }

    static async createUser(name: string, email: string, password: string): Promise<User> {
        ensureDataDir();
        const users: User[] = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

        // Check if user exists
        if (users.find(u => u.email === email)) {
            throw new Error('Email already registered');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser: User = {
            id: Date.now().toString(),
            name,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        users.push(newUser);
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));

        return newUser;
    }

    static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
}
