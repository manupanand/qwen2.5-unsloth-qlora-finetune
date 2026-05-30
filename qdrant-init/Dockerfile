FROM alpine:3.19
RUN apk add --no-cache curl bash
WORKDIR /init
COPY init.sh ./
RUN tr -d '\r' < init.sh > init_fixed.sh && mv init_fixed.sh init.sh && chmod +x init.sh
CMD ["bash", "./init.sh"]
