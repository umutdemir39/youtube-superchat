@echo off
echo SC Manager EXE Kurulum Dosyasi Olusturuluyor...
echo Lutfen bekleyin, bu islem bilgisayar hizina gore 1-2 dakika surebilir.
echo.

call npm run dist

echo.
echo Islem tamamlandi!
echo 'dist' klasoru icerisinde uygulamanin kurulum dosyasini bulabilirsiniz.
pause
