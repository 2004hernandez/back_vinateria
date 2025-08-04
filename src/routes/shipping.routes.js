// src/routes/shipping.routes.js
import express from "express";
import { calcularCostoEnvio } from "../controllers/Shipping.controller.js";

const router = express.Router();

router.post("/calcular", calcularCostoEnvio); // Método POST porque recibe JSON

export default router;
