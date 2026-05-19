FROM lscr.io/linuxserver/transmission:latest

COPY src/ /web-ui/

ENV TRANSMISSION_WEB_HOME=/web-ui
