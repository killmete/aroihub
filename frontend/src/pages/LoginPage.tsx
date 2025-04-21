import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Link, useNavigate } from 'react-router-dom';
import { TextField } from '@mui/material';

const Login: React.FC = () => {
    const { login, authState } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isFormValid, setIsFormValid] = useState(false);

    useEffect(() => {
        // Check if both email and password have values
        const isValid = formData.email.trim() !== '' && formData.password.trim() !== '';
        setIsFormValid(isValid);
    }, [formData.email, formData.password]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            await login(formData);
            setSuccess('เข้าสู่ระบบสำเร็จ!');
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เข้าสู่ระบบล้มเหลว กรุณาลองอีกครั้ง');
        }
    };

    return (
        <div className="flex items-center justify-center py-16 font-kanit text-black">
            <div className="w-full max-w-sm px-4">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-semibold font-kanit">เข้าสู่ระบบ</h2>
                </div>
                <form onSubmit={handleSubmit} className="w-full">
                    <div className="mb-6">
                        <TextField
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            label="อีเมล"
                            variant="outlined"
                            fullWidth
                            size="small"
                            className="mt-2"
                        />
                    </div>
                    <div className="mb-4">
                        <TextField
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            label="รหัสผ่าน"
                            variant="outlined"
                            fullWidth
                            size="small"
                            className="mt-2"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {success && <p className="text-green-500 text-sm">{success}</p>}
                    <button
                        type="submit"
                        className="w-full btn text-white bg-blue-accent border-blue-accent border-1 hover:bg-blue-accent-200 font-semibold p-2 mt-4 rounded-2xl disabled:opacity-70 disabled:cursor-not-allowed auth-button"
                        disabled={authState.loading || !isFormValid}
                    >
                        {authState.loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                    </button>
                    <div className="mt-4 text-right">
                        <Link to="/register" className="text-black underline text-sm">สมัครสมาชิก</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;