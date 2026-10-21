"""Одноразовый TLS исключительно для локальной browser fixture. Не production CA."""
import sys
from pathlib import Path
from datetime import datetime,timedelta,timezone
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import rsa
p=Path(sys.argv[1]);p.mkdir(exist_ok=False)
key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
name=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,"Synthetic Nexus localhost fixture")])
now=datetime.now(timezone.utc)
cert=(x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
 .serial_number(x509.random_serial_number()).not_valid_before(now-timedelta(minutes=1))
 .not_valid_after(now+timedelta(days=1)).add_extension(x509.SubjectAlternativeName([
 x509.DNSName("d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net"),x509.DNSName("cdn.jsdelivr.net")]),critical=False)
 .sign(key,hashes.SHA256()))
(p/"key.pem").write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
(p/"cert.pem").write_bytes(cert.public_bytes(serialization.Encoding.PEM))
