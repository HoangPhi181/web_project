- khi pull về máy thì vào thư mục frontend --> npm install để install thư viện
- để chạy local thì vào file axiosClient đổi baseURL thành local comment sẵn
- sau đó npm run dev để chạy

--------------------------deploy hosting---------------------------------------
1. dùng vercel để deploy frontend 
    - b1: đk/ đn bằng tk git
    - b2: chọn add new --> project // khi đã có tk
    - b3: hiển thị ds repo cần deploy --> chọn repo cần
    - b4: chọn dir frontend --> framework (Vite)
    - b5: deploy
2. dùng render để deploy backend
    - b1: đk/ đn bằng tk git
    - b2: nhập tt cơ bản (quan trọng add .env sau khi dùng aiven)
    - b3: sau khi tạo xong lấy link thay cho http://localhost:5000
3. dùng aiven để đẩy mysql (bảng free chỉ cho 1 server)
    - b1: đk/ đn bằng git
    - b2: vào dashboard --> service --> mysql
    - b3: chọn các mục đang cần
    - b4: hiện bảng mySQL có các thông tin host, port, user, pass,...
    - b5: vào termial mysqldump -u root -p <ten_database> > backup.sql --> pass db local
            --> mysql -u avnadmin -p -h mysql-17acd944-student-d41d.i.aivencloud.com -P 19923 defaultdb < backup.sql --> pass db aiven
            --> npm start
