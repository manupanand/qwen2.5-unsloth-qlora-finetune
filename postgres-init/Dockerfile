# # FROM postgres:16-alpine
# # RUN apk add --no-cache bash dos2unix
# # WORKDIR /init
# # COPY init.sh ./
# # COPY schema.sql ./
# # RUN dos2unix init.sh && chmod +x init.sh
# # CMD ["bash", "./init.sh"]

# FROM postgres:16-alpine
# RUN apk add --no-cache bash
# WORKDIR /init
# COPY init.sh ./
# COPY schema.sql ./
# RUN tr -d '\r' < init.sh > init_fixed.sh && mv init_fixed.sh init.sh && chmod +x init.sh
# CMD ["bash", "./init.sh"]

FROM postgres:16-alpine
RUN apk add --no-cache bash
WORKDIR /init
COPY init.sh ./
COPY schema.sql ./
RUN tr -d '\r' < init.sh > init_fixed.sh && mv init_fixed.sh init.sh && chmod +x init.sh
CMD ["bash", "./init.sh"]
