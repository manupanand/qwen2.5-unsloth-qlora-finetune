# # FROM minio/mc:latest
# # USER root
# # RUN apk add --no-cache dos2unix || true
# # WORKDIR /init
# # COPY init.sh ./
# # RUN dos2unix init.sh 2>/dev/null || sed -i 's/\r//' init.sh && chmod +x init.sh
# # CMD ["/bin/sh", "./init.sh"]

# FROM minio/mc:latest
# USER root
# WORKDIR /init
# COPY init.sh ./
# # tr is always available in busybox — strips \r without needing sed or dos2unix
# RUN tr -d '\r' < init.sh > init_fixed.sh && mv init_fixed.sh init.sh && chmod +x init.sh
# CMD ["/bin/sh", "./init.sh"]

FROM minio/mc:latest
USER root
WORKDIR /init
COPY init.sh ./
RUN tr -d '\r' < init.sh > init_fixed.sh && mv init_fixed.sh init.sh && chmod +x init.sh
ENTRYPOINT ["/bin/sh", "./init.sh"]
