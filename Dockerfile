FROM lscr.io/linuxserver/transmission:latest

ENV TRANSMISSION_WEB_HOME=/web-ui

COPY src/ /web-ui/

EXPOSE 9091
EXPOSE 51413
EXPOSE 51413/udp
