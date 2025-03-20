#!/bin/bash
mkdir -p certificate
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout certificate/ca.key -out certificate/ca.crt -config ca.conf
openssl req -new -nodes -newkey rsa:2048 -keyout certificate/server.key -out certificate/server.csr -config server.conf
openssl x509 -req -in certificate/server.csr -CA certificate/ca.crt -CAkey certificate/ca.key -CAcreateserial -out certificate/server.crt -days 3650 -extensions req_ext -extfile server.conf

chmod 600 certificate/ca.key certificate/server.key
chmod 644 certificate/ca.crt certificate/server.crt certificate/server.csr