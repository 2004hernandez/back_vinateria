BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Contacto] (
    [id] INT NOT NULL IDENTITY(1,1),
    [motivo] NVARCHAR(1000) NOT NULL,
    [nombre] NVARCHAR(1000),
    [email] NVARCHAR(1000) NOT NULL,
    [telefono] NVARCHAR(1000),
    [comentario] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Contacto_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [responded] BIT NOT NULL CONSTRAINT [Contacto_responded_df] DEFAULT 0,
    [respuesta] NVARCHAR(1000),
    [respondedAt] DATETIME2,
    CONSTRAINT [Contacto_pkey] PRIMARY KEY CLUSTERED ([id])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
