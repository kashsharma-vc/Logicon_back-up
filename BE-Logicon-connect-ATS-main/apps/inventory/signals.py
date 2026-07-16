from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import InventoryItem, StockMovement

@receiver(post_save, sender=InventoryItem)
def create_stock_movement_on_item_save(sender, instance, created, **kwargs):
    """
    Automatically generate a StockMovement for testing purposes
    whenever an InventoryItem is created.
    """
    if created and instance.stock > 0:
        # Initial stock incoming
        StockMovement.objects.create(
            item=instance,
            movement_type='incoming',
            reference_number=f"INIT-{instance.id}",
            reference_module='InventoryItem',
            previous_quantity=0,
            movement_quantity=instance.stock,
            current_quantity=instance.stock,
            status='completed',
            remarks='Initial stock entry (auto-generated)'
        )
