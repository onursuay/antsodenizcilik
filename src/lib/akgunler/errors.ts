export class AkgunlerApiError extends Error {
  constructor(
    public hata: string,
    public hataAciklama: string
  ) {
    super(hataAciklama || hata || "Akgunler API hatasi");
    this.name = "AkgunlerApiError";
  }
}
