# g3proxy — build từ source bytedance/g3 (Rust, Apache-2.0). PIN commit SHA cụ thể.
# Build: docker build --build-arg G3_REF=<sha> -t localhost:5000/soloceo/g3proxy .
# [CẦN KIỂM CHỨNG] tên binary + đường build chính xác theo repo g3.
FROM rust:1-slim AS build
ARG G3_REF=main
RUN apt-get update && apt-get install -y git capnproto libssl-dev pkg-config && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/bytedance/g3.git /src && cd /src && git checkout ${G3_REF}
WORKDIR /src
RUN cargo build -p g3proxy --release
FROM debian:12-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /src/target/release/g3proxy /usr/local/bin/g3proxy
COPY g3proxy.yaml /etc/g3proxy/g3proxy.yaml
EXPOSE 3128
ENTRYPOINT ["g3proxy", "-c", "/etc/g3proxy/g3proxy.yaml"]
