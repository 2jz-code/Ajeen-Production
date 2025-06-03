from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import CustomUser

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(
        required=False, allow_blank=True
    )  # <--- MODIFIED LINE

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_pos_user",
            "is_website_user",
            "password",
            "confirm_password",
            "date_joined",
            "last_login",
            "is_active",
            "is_rewards_opted_in",
            "phone_number",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]

    def validate(self, data):
        if self.instance is None and "password" in data:
            if "confirm_password" in data:
                if data.get("password") != data.get("confirm_password"):
                    raise serializers.ValidationError(
                        {"confirm_password": "Passwords do not match"}
                    )
                data.pop("confirm_password")
        return data

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class WebsiteUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "password",
            "is_rewards_opted_in",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
