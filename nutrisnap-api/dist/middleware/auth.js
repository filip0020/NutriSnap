"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const JWT_SECRET = process.env.JWT_SECRET;
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const user = await User_1.default.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({ message: 'Nu ești autorizat, utilizatorul nu există.' });
            }
            req.user = { id: user._id.toString() };
            next();
        }
        catch (error) {
            return res.status(401).json({ message: 'Nu ești autorizat, token invalid sau expirat.' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Nu ești autorizat, token-ul lipsește.' });
    }
};
exports.default = protect;
