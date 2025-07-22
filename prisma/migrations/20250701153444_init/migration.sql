BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Usuarios] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [lastname] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [telefono] NVARCHAR(1000) NOT NULL,
    [fechadenacimiento] DATETIME2 NOT NULL,
    [user] NVARCHAR(1000) NOT NULL,
    [preguntaSecreta] NVARCHAR(1000) NOT NULL,
    [respuestaSecreta] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [verified] BIT NOT NULL CONSTRAINT [Usuarios_verified_df] DEFAULT 0,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [Usuarios_role_df] DEFAULT 'NORMAL',
    [failedLoginAttempts] INT NOT NULL CONSTRAINT [Usuarios_failedLoginAttempts_df] DEFAULT 0,
    [lockedUntil] DATETIME2,
    [blocked] BIT NOT NULL CONSTRAINT [Usuarios_blocked_df] DEFAULT 0,
    [lockCount] INT NOT NULL CONSTRAINT [Usuarios_lockCount_df] DEFAULT 0,
    [lastLogin] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Usuarios_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Usuarios_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Usuarios_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[LoginHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [usuarioId] INT NOT NULL,
    [loginAt] DATETIME2 NOT NULL CONSTRAINT [LoginHistory_loginAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LoginHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Productos] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [description] VARCHAR(500) NOT NULL,
    [precio] FLOAT(53) NOT NULL,
    [sabor] NVARCHAR(1000) NOT NULL,
    [tamano] INT NOT NULL,
    [stock] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Productos_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Productos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ImagenesProductos] (
    [id] INT NOT NULL IDENTITY(1,1),
    [imageUrl] NVARCHAR(1000) NOT NULL,
    [productoId] INT NOT NULL,
    CONSTRAINT [ImagenesProductos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Reviews] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productoId] INT NOT NULL,
    [usuarioId] INT NOT NULL,
    [comment] VARCHAR(200) NOT NULL,
    [rating] INT NOT NULL CONSTRAINT [Reviews_rating_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Reviews_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Reviews_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Pedidos] (
    [id] INT NOT NULL IDENTITY(1,1),
    [usuarioId] INT NOT NULL,
    [fecha_pedido] DATETIME2 NOT NULL,
    [estado] NVARCHAR(1000) NOT NULL,
    [total] FLOAT(53) NOT NULL,
    CONSTRAINT [Pedidos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Detalle_Pedido] (
    [id] INT NOT NULL IDENTITY(1,1),
    [pedidoId] INT NOT NULL,
    [productoId] INT NOT NULL,
    [cantidad] INT NOT NULL,
    [precio_unitario] FLOAT(53) NOT NULL,
    CONSTRAINT [Detalle_Pedido_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Pagos] (
    [id] INT NOT NULL IDENTITY(1,1),
    [pedidoId] INT NOT NULL,
    [metodo_pago] NVARCHAR(1000) NOT NULL,
    [estado_pago] NVARCHAR(1000) NOT NULL,
    [fecha_pago] DATETIME2 NOT NULL,
    [monto] FLOAT(53) NOT NULL,
    CONSTRAINT [Pagos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Envíos] (
    [id] INT NOT NULL IDENTITY(1,1),
    [pedidoId] INT NOT NULL,
    [empresa_mensajeria] NVARCHAR(1000) NOT NULL,
    [codigo_seguimiento] NVARCHAR(1000) NOT NULL,
    [fecha_envío] DATETIME2 NOT NULL,
    [fecha_estimada_entrega] DATETIME2 NOT NULL,
    CONSTRAINT [Envíos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Carrito] (
    [id] INT NOT NULL IDENTITY(1,1),
    [usuarioId] INT NOT NULL,
    [productoId] INT NOT NULL,
    [cantidad] INT NOT NULL,
    CONSTRAINT [Carrito_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Sales] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productoId] INT NOT NULL,
    [usuarioId] INT,
    [fechaVenta] DATETIME2 NOT NULL CONSTRAINT [Sales_fechaVenta_df] DEFAULT CURRENT_TIMESTAMP,
    [cantidad] INT NOT NULL CONSTRAINT [Sales_cantidad_df] DEFAULT 1,
    [precioUnitario] FLOAT(53) NOT NULL,
    [total] FLOAT(53) NOT NULL,
    CONSTRAINT [Sales_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Promociones] (
    [id] INT NOT NULL IDENTITY(1,1),
    [titulo] NVARCHAR(1000) NOT NULL,
    [descripcion] NVARCHAR(1000),
    [fechaInicio] DATETIME2 NOT NULL,
    [fechaFin] DATETIME2,
    [activo] BIT NOT NULL CONSTRAINT [Promociones_activo_df] DEFAULT 1,
    [descuento] INT NOT NULL,
    [productoId] INT NOT NULL,
    CONSTRAINT [Promociones_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Logos] (
    [id] INT NOT NULL IDENTITY(1,1),
    [url] NVARCHAR(1000) NOT NULL,
    [fechaSubida] DATETIME2 NOT NULL CONSTRAINT [Logos_fechaSubida_df] DEFAULT CURRENT_TIMESTAMP,
    [autor] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Logos_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Logos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Terminos] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Terminos_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [effectiveDate] DATETIME2 NOT NULL,
    [isCurrent] BIT NOT NULL CONSTRAINT [Terminos_isCurrent_df] DEFAULT 0,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Terminos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Politicas] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Politicas_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [effectiveDate] DATETIME2 NOT NULL,
    [isCurrent] BIT NOT NULL CONSTRAINT [Politicas_isCurrent_df] DEFAULT 0,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Politicas_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Deslindes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Deslindes_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [effectiveDate] DATETIME2 NOT NULL,
    [isCurrent] BIT NOT NULL CONSTRAINT [Deslindes_isCurrent_df] DEFAULT 0,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Deslindes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LoginHistory_usuarioId_fkey] ON [dbo].[LoginHistory]([usuarioId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImagenesProductos_productoId_fkey] ON [dbo].[ImagenesProductos]([productoId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Reviews_productoId_fkey] ON [dbo].[Reviews]([productoId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Reviews_usuarioId_fkey] ON [dbo].[Reviews]([usuarioId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Pedidos_usuarioId_fkey] ON [dbo].[Pedidos]([usuarioId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Detalle_Pedido_pedidoId_fkey] ON [dbo].[Detalle_Pedido]([pedidoId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Detalle_Pedido_productoId_fkey] ON [dbo].[Detalle_Pedido]([productoId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Pagos_pedidoId_fkey] ON [dbo].[Pagos]([pedidoId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Envíos_pedidoId_fkey] ON [dbo].[Envíos]([pedidoId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Carrito_productoId_fkey] ON [dbo].[Carrito]([productoId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Carrito_usuarioId_fkey] ON [dbo].[Carrito]([usuarioId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Sales_productoId_idx] ON [dbo].[Sales]([productoId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Sales_usuarioId_idx] ON [dbo].[Sales]([usuarioId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Sales_fechaVenta_idx] ON [dbo].[Sales]([fechaVenta]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Promociones_productoId_idx] ON [dbo].[Promociones]([productoId]);

-- AddForeignKey
ALTER TABLE [dbo].[LoginHistory] ADD CONSTRAINT [LoginHistory_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[Usuarios]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ImagenesProductos] ADD CONSTRAINT [ImagenesProductos_productoId_fkey] FOREIGN KEY ([productoId]) REFERENCES [dbo].[Productos]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Reviews] ADD CONSTRAINT [Reviews_productoId_fkey] FOREIGN KEY ([productoId]) REFERENCES [dbo].[Productos]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Reviews] ADD CONSTRAINT [Reviews_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[Usuarios]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Pedidos] ADD CONSTRAINT [Pedidos_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[Usuarios]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Detalle_Pedido] ADD CONSTRAINT [Detalle_Pedido_pedidoId_fkey] FOREIGN KEY ([pedidoId]) REFERENCES [dbo].[Pedidos]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Detalle_Pedido] ADD CONSTRAINT [Detalle_Pedido_productoId_fkey] FOREIGN KEY ([productoId]) REFERENCES [dbo].[Productos]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Pagos] ADD CONSTRAINT [Pagos_pedidoId_fkey] FOREIGN KEY ([pedidoId]) REFERENCES [dbo].[Pedidos]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Envíos] ADD CONSTRAINT [Envíos_pedidoId_fkey] FOREIGN KEY ([pedidoId]) REFERENCES [dbo].[Pedidos]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Carrito] ADD CONSTRAINT [Carrito_productoId_fkey] FOREIGN KEY ([productoId]) REFERENCES [dbo].[Productos]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Carrito] ADD CONSTRAINT [Carrito_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[Usuarios]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Sales] ADD CONSTRAINT [Sales_productoId_fkey] FOREIGN KEY ([productoId]) REFERENCES [dbo].[Productos]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Sales] ADD CONSTRAINT [Sales_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[Usuarios]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Promociones] ADD CONSTRAINT [Promociones_productoId_fkey] FOREIGN KEY ([productoId]) REFERENCES [dbo].[Productos]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
