# Generated by Django 4.1.7 on 2023-04-08 15:53

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("trips", "0003_trip_driver_trip_rider"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="photo",
            field=models.ImageField(blank=True, null=True, upload_to="photos"),
        ),
    ]