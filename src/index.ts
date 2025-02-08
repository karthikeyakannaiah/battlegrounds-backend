import {logger} from './logger';
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes";
import cors from "cors";
import { getFirestore } from "firebase-admin/firestore";

import admin from "firebase-admin";
dotenv.config();

// need to use firebase validate Token here

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT || '{}');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

import { DecodedIdToken } from "firebase-admin/auth";


declare global {
    namespace Express {
      interface Request {
        user?: DecodedIdToken;
      }
    }
}

const PORT = process.env.PORT || 5000;

const app = express();

const corsOptions = {
    origin: ['http://localhost:3000', 'https://yourdomain.com'],
    optionsSuccessStatus: 200
  };
app.use(cors(corsOptions));
app.use(express.json());
app.use(validateToken);


/**
 * @name getPlayerData
 * @param param0 
 * @returns 
 */
async function getPlayerData({ playerId, db }: { playerId: string, db: FirebaseFirestore.Firestore }) {
    const playerDoc = await db.doc('players/' + playerId).get();
    if (playerDoc.exists) {
        return playerDoc.data();
    }
    return null;
}

async function validateToken(req:Request, res:Response, next: NextFunction) {
    logger(`
        Request: started
        TimeStamp: ${new Date().toISOString()}
        Method: ${req.method}
        Path: ${req.path}
        Body: ${req.body}
        `);
    try {
        let token = req.headers.authorization;
        token = token?.split("Bearer ")[1];
        if (!token) {
            throw new Error("No token provided");
        }
        // validate token here using firebase admin sdk
        const decodedToken = await admin.auth().verifyIdToken(token);
        const db = getFirestore();

        const adminDoc = await db.doc('admins/' + decodedToken.uid).get();
        req.user = decodedToken;

        if (adminDoc.exists) {
            const doc = adminDoc.data()
            if (doc?.isSuperAdmin) {
                req.user.isSuperAdmin = true;
            }
        } else {
            req.user.isSuperAdmin = false;
        }

        const playerData = await getPlayerData({ playerId: decodedToken.uid, db });
        if (playerData) {
            req.user.playerData = playerData;
        } else {
            // add player data here
            await db.collection('players').doc(decodedToken.uid).set({
                uid: req.user?.uid,
                email: req.user?.email,
                name: req.user?.name,
                email_verified: req.user?.email_verified || false,
                picture: req.user?.picture,
                isSuperAdmin: req.user?.isSuperAdmin || false
            });
            req.user.playerData = await getPlayerData({ playerId: decodedToken.uid, db });
        }

        next();
    } catch (error) {
        logger(error);
        res.status(400).json({
            message: "Authentication failed.",
            error
        });
    }
}

app.get("/hello", async (req: Request, res: Response) => {
    res.json({
        message: "Welcome"
    });
});


app.use("/api/user", userRoutes);


app.listen(PORT, ((err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("listening successfully on PORT", PORT);
    }
}));