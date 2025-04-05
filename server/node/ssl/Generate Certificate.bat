@echo off
mkdir certificate 2>nul
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout certificate\ca.key -out certificate\ca.crt -config ca.conf
openssl req -new -nodes -newkey rsa:2048 -keyout certificate\server.key -out certificate\server.csr -config server.conf
openssl x509 -req -in certificate\server.csr -CA certificate\ca.crt -CAkey certificate\ca.key -CAcreateserial -out certificate\server.crt -days 3650 -extensions req_ext -extfile server.conf