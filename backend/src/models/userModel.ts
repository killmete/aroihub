import db from '../db';
import bcrypt from 'bcrypt';

interface User {
    id?: number;
    username: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    profile_picture_url?: string;
    created_at?: Date;
    updated_at?: Date;
    role_id: number;
}

// Create an in-memory store for user updates (in a real application, this would be in Redis or a database)
const userUpdates: Map<number, { data: Partial<User>, timestamp: Date }> = new Map();

export async function createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'password_hash'> & { password: string }): Promise<User> {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(userData.password, salt);

    const query = `
    INSERT INTO users 
    (username, email, password_hash, first_name, last_name, phone_number, profile_picture_url, created_at, updated_at, role_id) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8) 
    RETURNING id, username, email, first_name, last_name, phone_number, profile_picture_url, created_at, updated_at, role_id
  `;

    const values = [
        userData.username,
        userData.email,
        password_hash,
        userData.first_name,
        userData.last_name,
        userData.phone_number || null,
        userData.profile_picture_url || null,
        userData.role_id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
}

export async function getUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

export async function getUserByUsername(username: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await db.query(query, [username]);

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

export async function verifyPassword(providedPassword: string, storedHash: string): Promise<boolean> {
    return bcrypt.compare(providedPassword, storedHash);
}

export async function updateUserById(userId: number, userData: Partial<User>): Promise<User | null> {
    // Create dynamic query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Only include fields that are provided
    if (userData.username !== undefined) {
        updates.push(`username = $${paramIndex}`);
        values.push(userData.username);
        paramIndex++;
    }

    if (userData.email !== undefined) {
        updates.push(`email = $${paramIndex}`);
        values.push(userData.email);
        paramIndex++;
    }

    if (userData.first_name !== undefined) {
        updates.push(`first_name = $${paramIndex}`);
        values.push(userData.first_name);
        paramIndex++;
    }

    if (userData.last_name !== undefined) {
        updates.push(`last_name = $${paramIndex}`);
        values.push(userData.last_name);
        paramIndex++;
    }

    if (userData.phone_number !== undefined) {
        updates.push(`phone_number = $${paramIndex}`);
        values.push(userData.phone_number);
        paramIndex++;
    }

    if (userData.profile_picture_url !== undefined) {
        updates.push(`profile_picture_url = $${paramIndex}`);
        values.push(userData.profile_picture_url);
        paramIndex++;
    }
    
    if (userData.role_id !== undefined) {
        updates.push(`role_id = $${paramIndex}`);
        values.push(userData.role_id);
        paramIndex++;
    }

    // Always update updated_at timestamp
    updates.push(`updated_at = NOW()`);

    // If no updates other than the timestamp, return the current user
    if (updates.length === 1 && updates[0].includes('updated_at')) {
        const currentUser = await getUserById(userId);
        return currentUser;
    }

    // Add user ID to values array
    values.push(userId);

    const query = `
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING id, username, email, first_name, last_name, phone_number, profile_picture_url, created_at, updated_at, role_id
    `;

    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
        const currentUser = await getUserById(userId);
        return currentUser;
    }
    
    return result.rows[0];
}

export async function getUserById(userId: number): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

export async function updatePassword(userId: number, newPassword: string): Promise<boolean> {
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    const query = `
        UPDATE users 
        SET password_hash = $1, updated_at = NOW() 
        WHERE id = $2
    `;

    const result = await db.query(query, [password_hash, userId]);
    
    // Fix the possibly null rowCount error by using a nullish coalescing operator
    return (result.rowCount ?? 0) > 0;
}

export async function getAllUsers(): Promise<Omit<User, 'password_hash'>[]> {
    const query = `
        SELECT id, username, email, first_name, last_name, phone_number, profile_picture_url, created_at, updated_at, role_id 
        FROM users 
        ORDER BY id
    `;
    const result = await db.query(query);
    return result.rows;
}

export async function deleteUserById(userId: number): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await db.query(query, [userId]);
    return (result.rowCount ?? 0) > 0;
}

export async function updateUserRole(userId: number, roleId: number): Promise<User | null> {
    const query = `
        UPDATE users 
        SET role_id = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING id, username, email, first_name, last_name, phone_number, profile_picture_url, created_at, updated_at, role_id
    `;
    
    const result = await db.query(query, [roleId, userId]);
    
    if (result.rows.length === 0) {
        return null;
    }
    
    return result.rows[0];
}

export async function storeUserUpdate(userId: number, updateData: Partial<User>): Promise<void> {
    userUpdates.set(userId, {
        data: updateData,
        timestamp: new Date()
    });
}

export async function getUserUpdates(userId: number): Promise<Partial<User> | null> {
    const update = userUpdates.get(userId);
    if (!update) {
        return null;
    }
    
    // Return the update data
    return update.data;
}

export async function clearUserUpdates(userId: number): Promise<void> {
    userUpdates.delete(userId);
}