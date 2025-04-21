import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';

// Validation middleware for profile updates
export const validateProfileUpdate = [
    body('username')
        .optional()
        .isLength({ min: 3, max: 30 })
        .withMessage('ชื่อผู้ใช้ต้องมีความยาวระหว่าง 3 ถึง 30 ตัวอักษร')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('ชื่อผู้ใช้สามารถใช้ได้เฉพาะตัวอักษร ตัวเลข และขีดล่าง (_) เท่านั้น'),

    body('email')
        .optional()
        .isEmail()
        .withMessage('กรุณาใส่อีเมลที่ถูกต้อง')
        .normalizeEmail(),

    body('first_name')
        .optional()
        .notEmpty()
        .withMessage('ชื่อจริงต้องไม่เว้นว่าง'),

    body('last_name')
        .optional()
        .notEmpty()
        .withMessage('นามสกุลต้องไม่เว้นว่าง'),

    body('phone_number')
        .optional({ nullable: true, checkFalsy: true })
        .isMobilePhone('any')
        .withMessage('โปรดกรอกเบอร์โทรศัพท์ที่ถูกต้อง')
        .isLength({ max: 10 })
        .withMessage('เบอร์โทรศัพท์ต้องไม่เกิน 10 ตัวเลข!')
];

// Validation middleware for password changes
export const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('โปรดกรอกรหัสผ่านปัจจุบัน'),

    body('newPassword')
        .notEmpty()
        .withMessage('โปรดกรอกรหัสผ่านใหม่!')
        .isLength({ min: 6 })
        .withMessage('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร!')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน!');
            }
            return true;
        })
];