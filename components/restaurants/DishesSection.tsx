import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import type { AggregatedDish } from '../../hooks/useRestaurantDetail';

interface DishesSectionProps {
  aggregatedDishes: AggregatedDish[];
  userId?: string;
  onDishPress: (dish: { imageUrl?: string; name: string; description?: string }) => void;
  onToggleLike: (contributionId: string, dishIndex: number) => void;
}

export default function DishesSection({ aggregatedDishes, userId, onDishPress, onToggleLike }: DishesSectionProps) {
  const [showAllDishes, setShowAllDishes] = useState(false);

  if (aggregatedDishes.length === 0) return null;

  const visibleDishes = aggregatedDishes.slice(0, 10);
  const hasMore = aggregatedDishes.length > 10;

  const renderLikeButton = (dish: AggregatedDish, isLiked: boolean) => {
    if (dish.sources.length === 0) return null;
    return (
      <TouchableOpacity
        style={styles.dishGridLikeBtn}
        activeOpacity={0.6}
        hitSlop={8}
        onPress={(e) => {
          e.stopPropagation?.();
          const src = dish.sources[0];
          onToggleLike(src.contributionKey.replace(/^contrib-/, ''), src.dishIndex);
        }}
      >
        <MaterialCommunityIcons
          name={isLiked ? 'thumb-up' : 'thumb-up-outline'}
          size={16}
          color={isLiked ? theme.colors.primary : theme.colors.textSecondary}
        />
        {dish.totalLikes > 0 && (
          <Text style={[styles.dishLikeCount, isLiked && styles.dishLikeCountPrimary]}>
            {dish.totalLikes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderScrollCard = (dish: AggregatedDish, idx: number) => {
    const isLiked = userId ? dish.likerIds.has(userId) : false;
    const thumbSrc = dish.thumbnailUrl ?? dish.imageUrl;
    return (
      <TouchableOpacity
        key={idx}
        style={styles.dishScrollCard}
        activeOpacity={0.8}
        onPress={() => onDishPress({ imageUrl: dish.imageUrl, name: dish.name, description: dish.description })}
      >
        {thumbSrc ? (
          <Image source={{ uri: thumbSrc }} style={styles.dishScrollImage} />
        ) : (
          <View style={styles.dishScrollImagePlaceholder}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={28} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.dishGridInfo}>
          <Text style={styles.dishGridName} numberOfLines={2}>{dish.name}</Text>
          <View style={styles.dishGridFooter}>
            {dish.count > 1 && <Text style={styles.dishGridHint}>×{dish.count}</Text>}
            {renderLikeButton(dish, isLiked)}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Surface style={styles.section} elevation={1}>
      <Text style={styles.sectionTitle}>Piatti della community ({aggregatedDishes.length})</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dishScroll}
        style={styles.dishScrollOuter}
      >
        {visibleDishes.map((dish, idx) => renderScrollCard(dish, idx))}
        {hasMore && (
          <TouchableOpacity
            style={styles.dishSeeAllCard}
            activeOpacity={0.7}
            onPress={() => setShowAllDishes(prev => !prev)}
          >
            <MaterialCommunityIcons
              name={showAllDishes ? 'chevron-up-circle-outline' : 'arrow-right-circle-outline'}
              size={32}
              color={theme.colors.primary}
            />
            <Text style={styles.dishSeeAllText}>
              {showAllDishes ? 'Mostra meno' : `Vedi tutti\n(${aggregatedDishes.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {showAllDishes && hasMore && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Tutti i piatti ({aggregatedDishes.length})</Text>
          <View style={styles.dishGrid}>
            {aggregatedDishes.map((dish, idx) => {
              const isLiked = userId ? dish.likerIds.has(userId) : false;
              const gridThumb = dish.thumbnailUrl ?? dish.imageUrl;
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.dishGridCard}
                  activeOpacity={0.8}
                  onPress={() => onDishPress({ imageUrl: dish.imageUrl, name: dish.name, description: dish.description })}
                >
                  {gridThumb ? (
                    <Image source={{ uri: gridThumb }} style={styles.dishGridImage} />
                  ) : (
                    <View style={styles.dishGridImagePlaceholder}>
                      <MaterialCommunityIcons name="silverware-fork-knife" size={32} color={theme.colors.primary} />
                    </View>
                  )}
                  <View style={styles.dishGridInfo}>
                    <Text style={styles.dishGridName} numberOfLines={2}>{dish.name}</Text>
                    {dish.description && (
                      <Text style={styles.dishGridDescription} numberOfLines={2}>{dish.description}</Text>
                    )}
                    <View style={styles.dishGridFooter}>
                      {dish.count > 1 && <Text style={styles.dishGridHint}>Segnalato {dish.count} volte</Text>}
                      {renderLikeButton(dish, isLiked)}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.showLessBtn}
            activeOpacity={0.6}
            onPress={() => setShowAllDishes(false)}
          >
            <Text style={styles.showLessText}>Mostra meno</Text>
            <MaterialCommunityIcons name="chevron-up" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  dishScrollOuter: {
    marginHorizontal: -16,
  },
  dishScroll: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 4,
  },
  dishScrollCard: {
    width: 150,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  dishScrollImage: {
    width: '100%',
    height: 90,
  },
  dishScrollImagePlaceholder: {
    width: '100%',
    height: 90,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dishSeeAllCard: {
    width: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  dishSeeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  showLessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 6,
  },
  showLessText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  dishGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dishGridCard: {
    width: '48%' as any,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  dishGridImage: {
    width: '100%',
    height: 110,
  },
  dishGridImagePlaceholder: {
    width: '100%',
    height: 110,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dishGridInfo: {
    padding: 8,
    paddingBottom: 4,
  },
  dishGridName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    lineHeight: 17,
  },
  dishGridDescription: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },
  dishGridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dishGridHint: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  dishGridLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dishLikeCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  dishLikeCountPrimary: {
    color: theme.colors.primary,
  },
});
