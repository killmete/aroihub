import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { createUser, getUserByEmail, getUserByUsername, verifyPassword } from '../models/userModel';
import logger from "../utils/logger";


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
}

// Register a new user
export const register: RequestHandler = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const {
            username,
            email,
            password,
            first_name,
            last_name,
            phone_number,
            profile_picture_url
        } = req.body;

        const role_id = 1;

        const existingEmail = await getUserByEmail(email);
        if (existingEmail) {
            res.status(400).json({ message: 'อีเมลถูกใช้แล้ว!' });
            return;
        }

        const existingUsername = await getUserByUsername(username);
        if (existingUsername) {
            res.status(400).json({ message: 'ยูสเซอร์เนมถูกใช้แล้ว!' });
            return;
        }

        const user = await createUser({
            username,
            email,
            password,
            first_name,
            last_name,
            phone_number,
            profile_picture_url,
            role_id
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username }, 
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                profile_picture_url: user.profile_picture_url,
                role_id: user.role_id
            }
        });
    } catch (error) {
        logger.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Login an existing user
export const login: RequestHandler = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { email, password } = req.body;

        const user = await getUserByEmail(email);
        if (!user) {
            res.status(401).json({ message: "ไม่พบอีเมล!" });
            return;
        }

        const isPasswordValid = await verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({ message: 'รหัสผ่านผิด!' });
            return;
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role_id: user.role_id,
                profile_picture_url: user.profile_picture_url
            }
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};
