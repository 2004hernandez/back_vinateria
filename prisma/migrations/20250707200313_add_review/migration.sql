/*
  Warnings:

  - You are about to drop the `Reviews` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Reviews] DROP CONSTRAINT [Reviews_productoId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Reviews] DROP CONSTRAINT [Reviews_usuarioId_fkey];

-- DropTable
DROP TABLE [dbo].[Reviews];

-- CreateTable
CREATE TABLE [dbo].[Review] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productoId] INT NOT NULL,
    [usuarioId] INT NOT NULL,
    [comment] VARCHAR(200) NOT NULL,
    [rating] INT NOT NULL CONSTRAINT [Review_rating_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Review_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Review_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Review_productoId_fkey] ON [dbo].[Review]([productoId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Review_usuarioId_fkey] ON [dbo].[Review]([usuarioId]);

-- AddForeignKey
ALTER TABLE [dbo].[Review] ADD CONSTRAINT [Review_productoId_fkey] FOREIGN KEY ([productoId]) REFERENCES [dbo].[Productos]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Review] ADD CONSTRAINT [Review_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[Usuarios]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
