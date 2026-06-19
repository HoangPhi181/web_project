# Sử dụng image Node.js phiên bản 20 làm môi trường chạy
FROM node:20

# Tạo thư mục làm việc bên trong container
WORKDIR /app

# Copy package.json và package-lock.json vào container
COPY package*.json ./

# Cài đặt các thư viện được khai báo trong package.json
RUN npm install

# Copy toàn bộ source code backend vào container
COPY . .

# Mở cổng 5000 để ứng dụng có thể nhận request từ bên ngoài
EXPOSE 5000

# Lệnh được thực thi khi container khởi động
CMD ["npm", "start"]