    import { Request, Response, NextFunction } from "express";
    import jwt from "jsonwebtoken";
        interface AuthRequest extends Request {
    user?: any; // TODO: Define a proper type for user
    }

    const AuthMiddleware = (req:AuthRequest, res:Response, next:NextFunction) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ message: 'No token provided or malformed header' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
        if (err) {
            console.log("Error de verificación del token:", err);
        return res.status(401).json({ message: 'Invalid or expired token' });
        }

        req.user = decoded; 
        next();
    });
    };
    export default AuthMiddleware;
