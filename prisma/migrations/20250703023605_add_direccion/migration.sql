BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Pedidos] ADD [direccionId] INT;

-- CreateTable
CREATE TABLE [dbo].[Direccion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [usuarioId] INT NOT NULL,
    [alias] NVARCHAR(1000),
    [calle] NVARCHAR(1000) NOT NULL,
    [numeroExterior] NVARCHAR(1000) NOT NULL,
    [numeroInterior] NVARCHAR(1000),
    [colonia] NVARCHAR(1000) NOT NULL,
    [ciudad] NVARCHAR(1000) NOT NULL,
    [estado] NVARCHAR(1000) NOT NULL,
    [codigoPostal] NVARCHAR(1000) NOT NULL,
    [pais] NVARCHAR(1000) NOT NULL CONSTRAINT [Direccion_pais_df] DEFAULT 'México',
    CONSTRAINT [Direccion_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Pedidos] ADD CONSTRAINT [Pedidos_direccionId_fkey] FOREIGN KEY ([direccionId]) REFERENCES [dbo].[Direccion]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Direccion] ADD CONSTRAINT [Direccion_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[Usuarios]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
